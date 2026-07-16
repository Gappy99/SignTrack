using SignTrack.Identity.Application.DTOs.Tasks;

namespace SignTrack.Identity.Application.Interfaces;

public interface ITaskService
{
    Task<TaskResponseDto> CreateAsync(string userId, CreateTaskDto dto);
    Task<TaskResponseDto> UpdateAsync(string userId, string taskId, UpdateTaskDto dto);
    Task DeleteAsync(string userId, string taskId);
    Task<IReadOnlyList<TaskResponseDto>> ListAsync(string userId, string? groupId, string? status);
}
