using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using SignTrack.Identity.Application.Interfaces;

namespace SignTrack.Identity.Api.Services;

public class CallsRoomClient(IHttpClientFactory httpClientFactory, ILogger<CallsRoomClient> logger)
    : ICallsRoomClient
{
    public async Task<string> CreateRoomAsync(string authorizationHeader, string title, int maxParticipants = 8)
    {
        var client = httpClientFactory.CreateClient("Calls");
        client.DefaultRequestHeaders.Authorization = AuthenticationHeaderValue.Parse(authorizationHeader);

        var response = await client.PostAsJsonAsync("/api/v1/rooms", new { title, maxParticipants });
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            logger.LogWarning("CreateRoom falló: {Status} {Body}", response.StatusCode, body);
            throw new InvalidOperationException("No se pudo crear la sala de reunión");
        }

        var room = await response.Content.ReadFromJsonAsync<RoomCreatedDto>();
        if (string.IsNullOrWhiteSpace(room?.Id))
            throw new InvalidOperationException("Respuesta de sala inválida");

        return room.Id;
    }

    private sealed class RoomCreatedDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;
    }
}
