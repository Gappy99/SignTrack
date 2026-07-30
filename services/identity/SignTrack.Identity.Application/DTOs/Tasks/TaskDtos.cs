namespace SignTrack.Identity.Application.DTOs.Tasks;

public class CreateTaskDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? AssigneeId { get; set; }
    public string? GroupId { get; set; }
    public DateTime? DueDate { get; set; }
}

public class UpdateTaskDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? AssigneeId { get; set; }
    public string? GroupId { get; set; }
    public DateTime? DueDate { get; set; }
    public string? Status { get; set; }
}

public class TaskResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string CreatedByUserId { get; set; } = string.Empty;
    public string? AssigneeId { get; set; }
    public string? GroupId { get; set; }
    public DateTime? DueDate { get; set; }
    public string Status { get; set; } = "pending";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
