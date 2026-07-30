using SignTrack.Identity.Application.DTOs.Tasks;
using SignTrack.Identity.Application.Interfaces;
using SignTrack.Identity.Application.Services;
using SignTrack.Identity.Domain.Entities;
using SignTrack.Identity.Domain.Interfaces;

namespace SignTrack.Identity.Application.Services;

public class TaskService(ITaskRepository tasks, IGroupRepository groups) : ITaskService
{
    public async Task<TaskResponseDto> CreateAsync(string userId, CreateTaskDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new ArgumentException("Title is required");

        if (!string.IsNullOrWhiteSpace(dto.GroupId))
        {
            if (!await groups.IsMemberAsync(dto.GroupId, userId))
                throw new UnauthorizedAccessException("No eres miembro del grupo");
        }

        await ValidateAssigneeAsync(dto.AssigneeId, dto.GroupId);

        var task = new TaskItem
        {
            Id = UuidGenerator.GenerateTaskId(),
            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim(),
            CreatedByUserId = userId,
            AssigneeId = dto.AssigneeId,
            GroupId = dto.GroupId,
            DueDate = dto.DueDate,
            Status = "pending"
        };

        await tasks.CreateAsync(task);
        return Map(task);
    }

    public async Task<TaskResponseDto> UpdateAsync(string userId, string taskId, UpdateTaskDto dto)
    {
        var task = await tasks.GetByIdAsync(taskId)
            ?? throw new KeyNotFoundException("Tarea no encontrada");

        if (task.CreatedByUserId != userId && task.AssigneeId != userId)
            throw new UnauthorizedAccessException("No puedes editar esta tarea");

        if (!string.IsNullOrWhiteSpace(dto.Title)) task.Title = dto.Title.Trim();
        if (dto.Description != null) task.Description = dto.Description.Trim();
        if (dto.AssigneeId != null)
        {
            await ValidateAssigneeAsync(dto.AssigneeId, dto.GroupId ?? task.GroupId);
            task.AssigneeId = dto.AssigneeId;
        }
        if (dto.GroupId != null) task.GroupId = dto.GroupId;
        if (dto.DueDate.HasValue) task.DueDate = dto.DueDate;
        if (!string.IsNullOrWhiteSpace(dto.Status)) task.Status = dto.Status.Trim();

        await tasks.UpdateAsync(task);
        return Map(task);
    }

    public async Task DeleteAsync(string userId, string taskId)
    {
        var task = await tasks.GetByIdAsync(taskId)
            ?? throw new KeyNotFoundException("Tarea no encontrada");

        if (task.CreatedByUserId != userId)
            throw new UnauthorizedAccessException("Solo el creador puede eliminar la tarea");

        await tasks.DeleteAsync(taskId);
    }

    public async Task<IReadOnlyList<TaskResponseDto>> ListAsync(string userId, string? groupId, string? status)
    {
        var items = await tasks.ListAsync(userId, groupId, status);
        return items.Select(Map).ToList();
    }

    private async Task ValidateAssigneeAsync(string? assigneeId, string? groupId)
    {
        if (string.IsNullOrWhiteSpace(assigneeId)) return;

        if (!string.IsNullOrWhiteSpace(groupId) && !await groups.IsMemberAsync(groupId, assigneeId))
            throw new ArgumentException("El asignado debe ser miembro del grupo");
    }

    private static TaskResponseDto Map(TaskItem t) => new()
    {
        Id = t.Id,
        Title = t.Title,
        Description = t.Description,
        CreatedByUserId = t.CreatedByUserId,
        AssigneeId = t.AssigneeId,
        GroupId = t.GroupId,
        DueDate = t.DueDate,
        Status = t.Status,
        CreatedAt = t.CreatedAt,
        UpdatedAt = t.UpdatedAt
    };
}
