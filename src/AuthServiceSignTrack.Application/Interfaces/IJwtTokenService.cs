
using AuthServiceSignTrack.Domain.Entities;

namespace AuthServiceSignTrack.Application.Interfaces;

public interface IJwtTokenService
{
    string GenerateToken(User user);
}