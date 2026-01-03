package org.eu.smileyik.ocae.simplebackend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "storage_essentia", indexes = {
    @Index(name = "idx_essentia_name", columnList = "name"),
    @Index(name = "idx_essentia_label", columnList = "label")
})
public class StorageEssentia extends BaseStorageEssentia {
}