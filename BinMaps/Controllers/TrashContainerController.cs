using BinMaps.Core.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace BinMaps.Controllers
{
    public class TrashContainerController : ControllerBase
    { 
       private readonly  ITrashContainerServices _trashContainerServices;

        public TrashContainerController(ITrashContainerServices trashContainerServices)
        {
            _trashContainerServices = trashContainerServices;
        }
        [HttpGet]
        public IActionResult Index()
        {
            return Ok();
        }
    }
}
