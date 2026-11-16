package com.sip.psm.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import com.sip.psm.entity.ProjectStatus;
public record ProjetDto(@NotBlank String libelle,String description,@NotNull @DecimalMin("0.0") BigDecimal budget,@Min(0) Integer duree,LocalDate dateDebut,LocalDate dateFin,@NotNull ProjectStatus statut,@NotNull @Min(0) @Max(100) Integer progression,@NotNull Long clientId){}
