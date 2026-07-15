
using SignTrack.Identity.Domain.Entities;

namespace SignTrack.Identity.Application.Interfaces;

public interface IJwtTokenService
{
    string GenerateToken(User user);
}