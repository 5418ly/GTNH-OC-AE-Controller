package org.eu.smileyik.ocae.simplebackend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "storage_fluids", indexes = {
    @Index(name = "idx_fluid_name", columnList = "name"),
    @Index(name = "idx_fluid_label", columnList = "label")
})
public class StorageFluid extends BaseStorageFluid {
}