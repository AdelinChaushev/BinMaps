using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BinMaps.Common.AuthViewModels
{
    public class LoginViewModel
    {
        [EmailAddress]
        public string Email { get; set; }
        [Required]
        [MaxLength(16)]
        [MinLength(8)]
        [DataType(DataType.Password)]
        public string Password { get; set; }
    }
}
