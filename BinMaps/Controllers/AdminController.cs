using BinMaps.Core.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[Authorize(Roles = "Admin")]
[Authorize(AuthenticationSchemes = "Bearer")]
[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IAreaAdminService _areaAdminService;

    public AdminController(IAreaAdminService areaAdminService)
    {
        _areaAdminService = areaAdminService;
    }
    [HttpGet("/getAllResultsAsync")]
    public async Task<IActionResult> GetAllResultsAsync()
    {
        var areas = await _areaAdminService.GetAllAreasAsync();
        return Ok(areas); 
    }

    [HttpPost("/assignTruck")]
    public async Task<IActionResult> AssignTruck(int areaId, string driverId)
    {
        await _areaAdminService.AssignTruckAsync(areaId, driverId);
        return Ok(new { areaId,driverId });
    }

    [HttpPost("/markAsCleaned")]
    public async Task<IActionResult> MarkAsCleaned(int areaId)
    {
        await _areaAdminService.MarkAreaAsCleanedAsync(areaId);
        return Ok("Marked");
    }
}

