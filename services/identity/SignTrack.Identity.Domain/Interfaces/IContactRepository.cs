using SignTrack.Identity.Domain.Entities;

namespace SignTrack.Identity.Domain.Interfaces;

public interface IContactRepository
{
    Task CreateBidirectionalAsync(string userIdA, string userIdB);
    Task<bool> ExistsAsync(string userIdA, string userIdB);
    Task<IReadOnlyList<User>> GetContactsAsync(string userId, string? query = null);
}
