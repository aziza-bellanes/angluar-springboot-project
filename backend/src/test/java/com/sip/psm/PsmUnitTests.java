package com.sip.psm;
import com.sip.psm.entity.*;
import com.sip.psm.repository.*;
import com.sip.psm.service.*;
import com.sip.psm.dto.ProjetDto;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
class PsmUnitTests {
@Test void rejectsInconsistentDates(){
ProjetRepository p=mock(ProjetRepository.class);ClientRepository c=mock(ClientRepository.class);
ProjetService service=new ProjetService(p,c);
ProjetDto input=new ProjetDto("Test","",new BigDecimal("100"),3,LocalDate.of(2026,6,3),LocalDate.of(2026,6,1),ProjectStatus.A_FAIRE,0,1L);
assertThrows(IllegalArgumentException.class,()->service.save(null,input));verifyNoInteractions(p,c);
}
@Test void fetchMissingProject(){ProjetRepository p=mock(ProjetRepository.class);ProjetService s=new ProjetService(p,mock(ClientRepository.class));when(p.findById(4L)).thenReturn(Optional.empty());assertThrows(RuntimeException.class,()->s.get(4L));}
}
