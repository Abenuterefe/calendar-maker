const mongoUserRepository = require('./mongoUserRepository');

// This file serves as the main entry point for the UserRepository abstraction.
// In a larger application, this might dynamically load different repository implementations
// (e.g., mongoUserRepository, psqlUserRepository) based on environment.
// For now, it simply exports our in-memory implementation.
module.exports = mongoUserRepository;
