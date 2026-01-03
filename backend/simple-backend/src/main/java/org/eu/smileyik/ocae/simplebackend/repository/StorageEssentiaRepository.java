package org.eu.smileyik.ocae.simplebackend.repository;

import org.eu.smileyik.ocae.simplebackend.model.StorageEssentia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StorageEssentiaRepository extends JpaRepository<StorageEssentia, Long> {
}
