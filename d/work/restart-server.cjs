try {process.kill(14168);console.log('Old server stopped');}catch(error){console.error(error.code,error.message);process.exitCode=1;}
