using Microsoft.AspNetCore.Mvc;
using BinMaps.Core.Contracts;
using BinMaps.Common.ReportCreateViewModel;
using System.Threading.Tasks;

namespace BinMaps.Controllers
{
    public class ReportsController : Controller
    {
        private readonly IReportService _reportService;

        public ReportsController(IReportService reportService)
        {
            _reportService = reportService;
        }

        [HttpGet]
        public async Task<IActionResult> Create()
        {
            var types = await _reportService.GetAllReportTypesAsync();
            ViewBag.ReportTypes = types;
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Create(ReportCreateViewModel model)
        {
            if (!ModelState.IsValid)
                return View(model);

            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            await _reportService.CreateReportAsync(userId, model);

            return RedirectToAction("Index");
        }

        [HttpGet]
        public async Task<IActionResult> Index()
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var reports = await _reportService.GetReportsByUserAsync(userId);
            return View(reports);
        }
    }
}
