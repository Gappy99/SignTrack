namespace SignTrack.Identity.Domain.Entities;

public class Appointment
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string HostUserId { get; set; } = string.Empty;
    public DateTime StartUtc { get; set; }
    public DateTime EndUtc { get; set; }
    public string? RoomId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<AppointmentParticipant> Participants { get; set; } = [];
}
