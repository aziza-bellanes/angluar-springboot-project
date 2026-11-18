package com.sip.psm.artist;

import com.sip.psm.artist.ArtistDtos.ArtistRequest;
import com.sip.psm.user.UserService;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ArtistNotificationEventTest {
    private final ArtistRepository artists = mock(ArtistRepository.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final ArtistService service = new ArtistService(artists, mock(UserService.class), events);
    private final Artist artist = new Artist();

    @BeforeEach
    void setup() {
        artist.setId(42L);
        artist.setEmail("artist@example.com");
        lenient().when(artists.findById(42L)).thenReturn(Optional.of(artist));
        lenient().when(artists.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void createsContactSnapshotAfterSave() {
        when(artists.save(any())).thenAnswer(call -> {
            Artist saved = call.getArgument(0);
            saved.setId(42L);
            return saved;
        });
        service.create(request(" artist@example.com "), "admin@example.com");
        verify(events).publishEvent(new ArtistContactCreatedEvent(42L, "Artist", "artist@example.com"));
    }

    @Test
    void welcomesNewlyAssignedEmail() {
        service.update(42L, request("new@example.com"));
        verify(events).publishEvent(new ArtistContactCreatedEvent(42L, "Artist", "new@example.com"));
    }

    @Test
    void ignoresUnchangedEmailIncludingCaseAndWhitespace() {
        service.update(42L, request(" ARTIST@example.com "));
        verifyNoInteractions(events);
    }

    private static ArtistRequest request(String email) {
        return new ArtistRequest(" Artist ", email, null, null, null, null, null, true);
    }
}
