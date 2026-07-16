namespace SignTrack.Identity.Domain.Entities;

public class AppointmentParticipant
{
    public string Id { get; set; } = string.Empty;
    public string AppointmentId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Status { get; set; } = "invited";
    public DateTime CreatedAt { get; set; }

    public Appointment Appointment { get; set; } = null!;
    public User User { get; set; } = null!;
}
