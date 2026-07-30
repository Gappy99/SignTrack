namespace SignTrack.Calls.Api.Dtos;

public record IceServerDto(string Urls, string? Username = null, string? Credential = null);
