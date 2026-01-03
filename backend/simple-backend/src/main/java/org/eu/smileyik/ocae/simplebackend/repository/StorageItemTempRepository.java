package org.eu.smileyik.ocae.simplebackend.repository;

import org.eu.smileyik.ocae.simplebackend.model.StorageItemTemp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StorageItemTempRepository extends JpaRepository<StorageItemTemp, Long> {
}
