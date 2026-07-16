using SignTrack.Identity.Domain.Entities;

namespace SignTrack.Identity.Domain.Interfaces;

public interface IAppointmentRepository
{
    Task<Appointment> CreateAsync(Appointment appointment);
    Task<Appointment?> GetByIdAsync(string id);
    Task<IReadOnlyList<Appointment>> ListForUserAsync(string userId);
    Task UpdateAsync(Appointment appointment);
}
