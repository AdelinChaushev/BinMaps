using BinMaps.Core.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[Authorize(Roles = "Admin")]
public class AdminController : Controller
{
    private readonly IAreaAdminService _areaAdminService;

    public AdminController(IAreaAdminService areaAdminService)
    {
        _areaAdminService = areaAdminService;
    }

    public async Task<IActionResult> Index()
    {
        var areas = await _areaAdminService.GetAllAreasAsync();
        return View(areas); 
    }

    [HttpPost]
    public async Task<IActionResult> AssignTruck(int areaId, string driverId)
    {
        await _areaAdminService.AssignTruckAsync(areaId, driverId);
        return RedirectToAction("Index");
    }

    [HttpPost]
    public async Task<IActionResult> MarkAsCleaned(int areaId)
    {
        await _areaAdminService.MarkAreaAsCleanedAsync(areaId);
        return RedirectToAction("Index");
    }
}
