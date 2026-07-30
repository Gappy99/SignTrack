using StackExchange.Redis;

namespace SignTrack.Messaging.Api.Services;

public class PresenceService(IConnectionMultiplexer redis)
{
    private static string Key(string userId) => $"SignTrack:Presence:{userId}";

    public Task SetOnlineAsync(string userId) =>
        redis.GetDatabase().StringSetAsync(Key(userId), "1", TimeSpan.FromMinutes(3));

    public Task SetOfflineAsync(string userId) =>
        redis.GetDatabase().KeyDeleteAsync(Key(userId));

    public async Task<IReadOnlyList<string>> GetOnlineUserIdsAsync()
    {
        var endPoints = redis.GetEndPoints();
        if (endPoints.Length == 0) return [];

        var server = redis.GetServer(endPoints[0]);
        var ids = new List<string>();

        await foreach (var key in server.KeysAsync(pattern: "SignTrack:Presence:*"))
        {
            var s = key.ToString();
            const string prefix = "SignTrack:Presence:";
            if (s.StartsWith(prefix, StringComparison.Ordinal))
                ids.Add(s[prefix.Length..]);
        }

        return ids;
    }
}
