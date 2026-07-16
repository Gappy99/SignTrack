using SignTrack.Identity.Domain.Entities;
using SignTrack.Identity.Domain.Interfaces;
using SignTrack.Identity.Persistence.Data;
using Microsoft.EntityFrameworkCore;

namespace SignTrack.Identity.Persistence.Repositories;

public class AppointmentRepository(ApplicationDbContext context) : IAppointmentRepository
{
    public async Task<Appointment> CreateAsync(Appointment appointment)
    {
        context.Appointments.Add(appointment);
        await context.SaveChangesAsync();
        return await GetByIdAsync(appointment.Id) ?? appointment;
    }

    public async Task<Appointment?> GetByIdAsync(string id) =>
        await context.Appointments
            .Include(a => a.Participants)
            .ThenInclude(p => p.User)
            .FirstOrDefaultAsync(a => a.Id == id);

    public async Task<IReadOnlyList<Appointment>> ListForUserAsync(string userId) =>
        await context.Appointments
            .Include(a => a.Participants)
            .Where(a => a.HostUserId == userId || a.Participants.Any(p => p.UserId == userId))
            .OrderBy(a => a.StartUtc)
            .ToListAsync();

    public async Task UpdateAsync(Appointment appointment)
    {
        context.Appointments.Update(appointment);
        await context.SaveChangesAsync();
    }
}
