package org.eu.smileyik.ocae.simplebackend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "storage_essentia_temp", indexes = {
    @Index(name = "idx_essentia_temp_name", columnList = "name")
})
public class StorageEssentiaTemp extends BaseStorageEssentia {
}
