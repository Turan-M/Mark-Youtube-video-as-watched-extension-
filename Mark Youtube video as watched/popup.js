document.getElementById('btn-export').addEventListener('click', function() {
  chrome.storage.local.get(null, function(items) { 
    var result = JSON.stringify(items); 
    var url = 'data:application/json;base64,' + btoa(result); 
    chrome.downloads.download({
      url: url,
      filename: 'backup.json' 
    });
  });
});

document.getElementById('btn-import').addEventListener('click', function() {
  document.getElementById('file-input').click(); 
});

document.getElementById('file-input').addEventListener('change', function(event) {
  var file = event.target.files[0]; 
  var reader = new FileReader();
  
  reader.onload = function(e) {
    var items = JSON.parse(e.target.result); 
    chrome.storage.local.clear(function() { 
      chrome.storage.local.set(items, function() { 
        console.log('Data imported successfully.');
        
      });
    });
  };

  reader.readAsText(file);
});

document.getElementById('btn-clear').addEventListener('click', function() {
  document.getElementById('confirm-clear').style.display = 'block'; 
});

document.getElementById('btn-clear-yes').addEventListener('click', function() {
  chrome.storage.local.clear(function() {
    console.log('Data cleared successfully.');

    document.getElementById('confirm-clear').style.display = 'none'; 
  });
});

document.getElementById('btn-clear-no').addEventListener('click', function() {
  document.getElementById('confirm-clear').style.display = 'none'; 
});



