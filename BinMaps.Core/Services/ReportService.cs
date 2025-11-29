using BinMaps.Core.Contracts;
using BinMaps.Data;
using BinMaps.Data.Entities;
using BinMaps.Common.ReportCreateViewModel;
using Microsoft.EntityFrameworkCore;

namespace BinMaps.Core.Services
{
    public class ReportService : IReportService
    {
        private readonly IRepository<Report, int> _reportRepo;
        private readonly IRepository<ReportType, int> _reportTypeRepo;

        public ReportService(IRepository<Report, int> reportRepo,
                             IRepository<ReportType, int> reportTypeRepo)
        {
            _reportRepo = reportRepo;
            _reportTypeRepo = reportTypeRepo;
        }

        public async Task<Report> CreateReportAsync(string userId, ReportCreateViewModel model)
        {
            var report = new Report
            {
                IdentityUserId = userId,
                ThrashContainerId = model.ContainerId,
                ReportTypeId = model.ReportTypeId,
                Description = model.Description,
                ReportDate = DateTime.UtcNow,
                IsApproved = false
            };

            await _reportRepo.AddAsync(report);
            return report;
        }

        public async Task<IEnumerable<ReportType>> GetAllReportTypesAsync()
        {
            return await _reportTypeRepo.GetAllAsync();
        }

        public async Task<IEnumerable<Report>> GetReportsByUserAsync(string userId)
        {
            return await _reportRepo.GetAllAttached()
                .Where(r => r.IdentityUserId == userId)
                .Include(r => r.ReportType)
                .ToArrayAsync();
        }

        public async Task<IEnumerable<Report>> GetApprovedReportsAsync()
        {
            return await _reportRepo.GetAllAttached()
                .Where(r => r.IsApproved)
                .Include(r => r.ReportType)
                .ToArrayAsync();
        }

        public async Task<bool> ApproveReportAsync(int reportId)
        {
            var report = await _reportRepo.GetByIdAsync(reportId);
            if (report == null) return false;

            report.IsApproved = true;
            report.ApprovedAt = DateTime.UtcNow;
            return await _reportRepo.UpdateAsync(report);
        }
    }
}
