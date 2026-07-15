using SignTrack.Identity.Application.DTOs.Requests;

namespace SignTrack.Identity.Application.Interfaces;

public interface IUserRequestService
{
    Task<UserRequestResponseDto> SendRequestAsync(string fromUserId, CreateUserRequestDto dto);
    Task<IReadOnlyList<UserRequestResponseDto>> GetInboxAsync(string toUserId);
    Task<UserRequestResponseDto> RespondAsync(string requestId, string toUserId, UpdateUserRequestDto dto);
}
