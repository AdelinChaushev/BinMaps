using Microsoft.AspNetCore.Mvc;
using BinMaps.Core.Contracts;
using BinMaps.Common.ReportCreateViewModel;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;

namespace BinMaps.Controllers
{
    [ApiController]
    [Authorize(AuthenticationSchemes = "Bearer")]
    [Route("api/reports")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reportService;

        public ReportsController(IReportService reportService)
        {
            _reportService = reportService;
        }

      

        [HttpPost("createReport")]
        public async Task<IActionResult> Create([FromBody]ReportCreateViewModel model)
        {

            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            await _reportService.CreateReportAsync(userId, model);

            return Ok(new { userId, model });
        }

        [HttpGet("reports")]
        public async Task<IActionResult> Index()
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var reports = await _reportService.GetReportsByUserAsync(userId);
            return Ok(reports);
        }
    }
}
