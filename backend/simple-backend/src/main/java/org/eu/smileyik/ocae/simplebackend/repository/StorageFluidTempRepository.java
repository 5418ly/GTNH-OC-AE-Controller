package org.eu.smileyik.ocae.simplebackend.repository;

import org.eu.smileyik.ocae.simplebackend.model.StorageFluidTemp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StorageFluidTempRepository extends JpaRepository<StorageFluidTemp, Long> {
}
