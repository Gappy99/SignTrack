using SignTrack.Identity.Domain.Entities;

namespace SignTrack.Identity.Domain.Interfaces;

public interface IUserRequestRepository
{
    Task<UserRequest> CreateAsync(UserRequest request);
    Task<UserRequest> GetByIdAsync(string id);
    Task<IReadOnlyList<UserRequest>> GetInboxAsync(string toUserId);
    Task<bool> ExistsPendingGroupInviteAsync(string fromUserId, string toUserId, string groupId);
    Task<UserRequest> UpdateAsync(UserRequest request);
}
