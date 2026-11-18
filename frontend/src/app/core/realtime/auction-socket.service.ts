import { Injectable, inject, signal } from '@angular/core';
import { Client, StompSubscription } from '@stomp/stompjs';
import { Observable, Subject } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { AuctionEvent } from '../models/api.models';

export type SocketState = 'idle' | 'connecting' | 'live' | 'reconnecting';

interface Channel {
  events: Subject<AuctionEvent>;
  observers: number;
  subscription: StompSubscription | null;
}

/**
 * One shared STOMP connection to `/ws`, opened with the first subscriber and closed with the last.
 * Every active topic is re-subscribed automatically after a reconnection.
 */
@Injectable({ providedIn: 'root' })
export class AuctionSocket {
  private readonly auth = inject(AuthStore);
  private readonly channels = new Map<string, Channel>();
  private client: Client | null = null;

  readonly state = signal<SocketState>('idle');

  /** Live events for one auction. */
  auction(id: number): Observable<AuctionEvent> {
    return this.topic(`/topic/auctions/${id}`);
  }

  /** Every auction event, used by listings. */
  all(): Observable<AuctionEvent> {
    return this.topic('/topic/auctions');
  }

  private topic(destination: string): Observable<AuctionEvent> {
    return new Observable<AuctionEvent>((observer) => {
      const channel = this.open(destination);
      const forwarding = channel.events.subscribe(observer);
      return () => {
        forwarding.unsubscribe();
        this.close(destination);
      };
    });
  }

  private open(destination: string): Channel {
    let channel = this.channels.get(destination);
    if (!channel) {
      channel = { events: new Subject<AuctionEvent>(), observers: 0, subscription: null };
      this.channels.set(destination, channel);
    }
    channel.observers++;
    const client = this.ensureClient();
    if (client.connected && !channel.subscription) {
      this.attach(client, destination, channel);
    }
    return channel;
  }

  private close(destination: string): void {
    const channel = this.channels.get(destination);
    if (!channel) {
      return;
    }
    channel.observers--;
    if (channel.observers > 0) {
      return;
    }
    if (this.client?.connected) {
      channel.subscription?.unsubscribe();
    }
    channel.events.complete();
    this.channels.delete(destination);
    if (this.channels.size === 0 && this.client) {
      void this.client.deactivate();
      this.client = null;
      this.state.set('idle');
    }
  }

  private ensureClient(): Client {
    if (this.client) {
      return this.client;
    }
    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    const token = this.auth.token();
    const client = new Client({
      brokerURL: `${scheme}://${location.host}/ws`,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        this.state.set('live');
        this.channels.forEach((channel, destination) => this.attach(client, destination, channel));
      },
      onWebSocketClose: () => {
        this.channels.forEach((channel) => (channel.subscription = null));
        this.state.set(this.channels.size > 0 ? 'reconnecting' : 'idle');
      },
    });
    this.client = client;
    this.state.set('connecting');
    client.activate();
    return client;
  }

  private attach(client: Client, destination: string, channel: Channel): void {
    channel.subscription = client.subscribe(destination, (message) =>
      channel.events.next(JSON.parse(message.body) as AuctionEvent),
    );
  }
}
