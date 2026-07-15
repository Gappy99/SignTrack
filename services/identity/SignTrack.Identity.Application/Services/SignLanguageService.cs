using System.Linq;
using SignTrack.Identity.Application.DTOs;
using SignTrack.Identity.Application.Interfaces;

namespace SignTrack.Identity.Application.Services;

public class SignLanguageService : ISignLanguageService
{
    // Note: This implementation uses a hard-coded dictionary of "signs".
    // You can replace this with a lookup from a database, CDN, or external service.
    private static readonly IReadOnlyDictionary<string, SignLanguageResourceDto> _resources =
        new Dictionary<string, SignLanguageResourceDto>(StringComparer.OrdinalIgnoreCase)
        {
            ["login"] = new SignLanguageResourceDto
            {
                Key = "login",
                Description = "Sign for 'login' (acceso, inicio de sesión).",
                VideoUrl = "/signs/placeholder.mp4",
                ImageUrl = "/signs/placeholder.png"
            },
            ["register"] = new SignLanguageResourceDto
            {
                Key = "register",
                Description = "Sign for 'register' (registrarse).",
                VideoUrl = "/signs/placeholder.mp4",
                ImageUrl = "/signs/placeholder.png"
            },
            ["verify-email"] = new SignLanguageResourceDto
            {
                Key = "verify-email",
                Description = "Sign for 'verify email' (verificar correo).",
                VideoUrl = "/signs/placeholder.mp4",
                ImageUrl = "/signs/placeholder.png"
            },
            ["forgot-password"] = new SignLanguageResourceDto
            {
                Key = "forgot-password",
                Description = "Sign for 'forgot password' (olvidé mi contraseña).",
                VideoUrl = "/signs/placeholder.mp4",
                ImageUrl = "/signs/placeholder.png"
            },
            ["reset-password"] = new SignLanguageResourceDto
            {
                Key = "reset-password",
                Description = "Sign for 'reset password' (restablecer contraseña).",
                VideoUrl = "/signs/placeholder.mp4",
                ImageUrl = "/signs/placeholder.png"
            }
        };

    public Task<IEnumerable<SignLanguageResourceDto>> GetAllResourcesAsync()
    {
        return Task.FromResult(_resources.Values.AsEnumerable());
    }

    public Task<SignLanguageResourceDto?> GetResourceAsync(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return Task.FromResult<SignLanguageResourceDto?>(null);
        }

        _resources.TryGetValue(key.Trim(), out var resource);
        return Task.FromResult(resource);
    }
}
