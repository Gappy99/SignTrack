using SignTrack.Identity.Domain.Entities;
using SignTrack.Identity.Domain.Interfaces;
using SignTrack.Identity.Persistence.Data;
using Microsoft.EntityFrameworkCore;

namespace SignTrack.Identity.Persistence.Repositories;

public class TaskRepository(ApplicationDbContext context) : ITaskRepository
{
    public async Task<TaskItem> CreateAsync(TaskItem task)
    {
        context.TaskItems.Add(task);
        await context.SaveChangesAsync();
        return task;
    }

    public async Task<TaskItem> UpdateAsync(TaskItem task)
    {
        context.TaskItems.Update(task);
        await context.SaveChangesAsync();
        return task;
    }

    public async Task<TaskItem?> GetByIdAsync(string id) =>
        await context.TaskItems.FirstOrDefaultAsync(t => t.Id == id);

    public async Task DeleteAsync(string id)
    {
        var task = await GetByIdAsync(id);
        if (task == null) return;
        context.TaskItems.Remove(task);
        await context.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<TaskItem>> ListAsync(string userId, string? groupId, string? status)
    {
        var query = context.TaskItems.AsQueryable()
            .Where(t => t.CreatedByUserId == userId || t.AssigneeId == userId);

        if (!string.IsNullOrWhiteSpace(groupId))
            query = query.Where(t => t.GroupId == groupId);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(t => t.Status == status);

        return await query.OrderByDescending(t => t.UpdatedAt).ToListAsync();
    }
}
