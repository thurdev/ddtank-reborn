package road7th.loader
{
   import flash.net.URLLoader;
   import flash.net.URLRequest;
   import road7th.debug.Log;
   
   public class DataLoader extends URLLoader
   {
      
      private var _request:URLRequest;
      
      private var _tryCount:int = 0;
      
      public function DataLoader(request:URLRequest = null)
      {
         this._request = request;
         super(request);
      }
      
      override public function load(request:URLRequest) : void
      {
         this._request = request;
         super.load(request);
         ++this._tryCount;
      }
      
      public function get url() : String
      {
         return this._request == null ? "" : this._request.url;
      }
      
      public function tryAgain() : void
      {
         Log.toTrace("DataLoader__tryAgain:" + this.url);
         this.load(this._request);
      }
      
      public function get tryCount() : int
      {
         return this._tryCount;
      }
   }
}

