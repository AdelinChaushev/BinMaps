using BinMaps.Common.ReportCreateViewModel;
using BinMaps.Data.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BinMaps.Core.Contracts
{
    public interface IReportService
    {
        Task<Report> CreateReportAsync(string userId, ReportCreateViewModel model);
        Task<IEnumerable<ReportType>> GetAllReportTypesAsync();
        Task<IEnumerable<Report>> GetReportsByUserAsync(string userId);
        Task<IEnumerable<Report>> GetApprovedReportsAsync();
        Task<bool> ApproveReportAsync(int reportId);
    }
}
