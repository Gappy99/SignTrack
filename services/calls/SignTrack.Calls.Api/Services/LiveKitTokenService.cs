using Livekit.Server.Sdk.Dotnet;
using Microsoft.Extensions.Options;
using SignTrack.Calls.Api.Configuration;

namespace SignTrack.Calls.Api.Services;

public class LiveKitTokenService(IOptions<LiveKitSettings> options)
{
    private readonly LiveKitSettings _settings = options.Value;

    public string Url => _settings.Url;

    public bool ShouldUseLiveKit(int participantCount, int maxParticipants) =>
        maxParticipants >= _settings.GroupThreshold;

    public LiveKitTokenDto CreateToken(string roomId, string userId, string displayName)
    {
        var token = new AccessToken(_settings.ApiKey, _settings.ApiSecret)
            .WithIdentity(userId)
            .WithName(displayName)
            .WithGrants(new VideoGrants
            {
                RoomJoin = true,
                Room = roomId,
                CanPublish = true,
                CanSubscribe = true,
            })
            .ToJwt();

        return new LiveKitTokenDto(token, _settings.Url);
    }
}

public record LiveKitTokenDto(string Token, string Url);
