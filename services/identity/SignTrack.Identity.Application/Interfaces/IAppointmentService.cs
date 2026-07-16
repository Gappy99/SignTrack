using SignTrack.Identity.Application.DTOs.Appointments;

namespace SignTrack.Identity.Application.Interfaces;

public interface IAppointmentService
{
    Task<AppointmentResponseDto> CreateAsync(string userId, CreateAppointmentDto dto);
    Task<IReadOnlyList<AppointmentResponseDto>> ListAsync(string userId);
    Task<AppointmentResponseDto> LinkRoomAsync(string userId, string appointmentId, string roomId);
}
