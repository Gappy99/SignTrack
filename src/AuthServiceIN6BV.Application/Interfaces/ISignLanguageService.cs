using AuthServiceIN6BV.Application.DTOs;

namespace AuthServiceIN6BV.Application.Interfaces;

public interface ISignLanguageService
{
    /// <summary>
    /// Returns a sign language resource for a known key.
    /// </summary>
    /// <param name="key">The resource key (lowercase, e.g. "login").</param>
    Task<SignLanguageResourceDto?> GetResourceAsync(string key);

    /// <summary>
    /// Returns all known sign language resources.
    /// </summary>
    Task<IEnumerable<SignLanguageResourceDto>> GetAllResourcesAsync();
}
