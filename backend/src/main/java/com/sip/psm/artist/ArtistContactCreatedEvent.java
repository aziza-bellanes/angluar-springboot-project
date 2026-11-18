package com.sip.psm.artist;

/** Contact snapshot for notifications after the surrounding transaction commits. */
public record ArtistContactCreatedEvent(Long artistId, String name, String email) {
}
