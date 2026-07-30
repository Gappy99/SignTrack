namespace SignTrack.Identity.Application.DTOs.Appointments;

public class CreateAppointmentDto
{
    public string Title { get; set; } = string.Empty;
    public DateTime StartUtc { get; set; }
    public DateTime EndUtc { get; set; }
    public IReadOnlyList<string>? ParticipantUserIds { get; set; }
}

public class AppointmentParticipantDto
{
    public string UserId { get; set; } = string.Empty;
    public string Status { get; set; } = "invited";
}

public class AppointmentResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string HostUserId { get; set; } = string.Empty;
    public DateTime StartUtc { get; set; }
    public DateTime EndUtc { get; set; }
    public string? RoomId { get; set; }
    public IReadOnlyList<AppointmentParticipantDto> Participants { get; set; } = [];
    public DateTime CreatedAt { get; set; }
}
