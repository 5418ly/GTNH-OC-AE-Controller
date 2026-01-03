package org.eu.smileyik.ocae.simplebackend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "storage_fluids_temp", indexes = {
    @Index(name = "idx_fluid_temp_name", columnList = "name")
})
public class StorageFluidTemp extends BaseStorageFluid {
}
