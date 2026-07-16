using SignTrack.Identity.Domain.Entities;

namespace SignTrack.Identity.Domain.Interfaces;

public interface ITaskRepository
{
    Task<TaskItem> CreateAsync(TaskItem task);
    Task<TaskItem> UpdateAsync(TaskItem task);
    Task<TaskItem?> GetByIdAsync(string id);
    Task DeleteAsync(string id);
    Task<IReadOnlyList<TaskItem>> ListAsync(string userId, string? groupId, string? status);
}
