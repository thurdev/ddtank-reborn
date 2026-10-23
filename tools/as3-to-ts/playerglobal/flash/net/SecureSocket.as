package flash.net
{
   import flash.security.*;
   import flash.utils.ByteArray;
   
   [native(cls="SecureSocketClass",instance="SecureSocketObject",methods="auto",construct="check")]
   [Event(name="securityError",type="flash.events.SecurityErrorEvent")]
   [Event(name="socketData",type="flash.events.ProgressEvent")]
   [Event(name="ioError",type="flash.events.IOErrorEvent")]
   [Event(name="connect",type="flash.events.Event")]
   [Event(name="close",type="flash.events.Event")]
   public class SecureSocket extends Socket
   {
      
      private static const SSL_OK:uint = 0;
      
      private static const SSL_NOT_AVAILABLE:uint = 1;
      
      private static const SSL_NO_CONNECTION:uint = 2;
      
      private static const SSL_HANDSHAKE_FAILED:uint = 3;
      
      private static const SSL_API_FAILURE:uint = 4;
      
      private static const SSL_CERT_EXPIRED:uint = 5;
      
      private static const SSL_CERT_PRINCIPAL_MISMATCH:uint = 6;
      
      private static const SSL_CERT_UNTRUSTED_SIGNERS:uint = 7;
      
      private static const SSL_CERT_REVOKED:uint = 8;
      
      private static const SSL_CERT_INVALID:uint = 9;
      
      private static const SSL_CERT_INVALID_CHAIN:uint = 10;
      
      private static const SSL_CERT_NOT_YET_VALID:uint = 11;
      
      private static const SSL_CERT_API_ERROR:uint = 12;
      
      public function SecureSocket()
      {
         super();
      }
      
      [API("668")]
      public static native function get isSupported() : Boolean;
      
      [API("668")]
      override public function connect(host:String, port:int) : void
      {
         super.connect(host,port);
      }
      
      [API("668")]
      public function get serverCertificateStatus() : String
      {
         if(this.getConnectionResultSet())
         {
            return this.connectionResultToCertStatus(this.getConnectionResult());
         }
         return CertificateStatus.UNKNOWN;
      }
      
      [API("674")]
      public native function get serverCertificate() : X509Certificate;
      
      [API("674")]
      public native function addBinaryChainBuildingCertificate(param1:ByteArray, param2:Boolean) : void;
      
      private native function getConnectionResultSet() : Boolean;
      
      private native function getConnectionResult() : uint;
      
      private function connectionResultToCertStatus(connectionResult:uint) : String
      {
         switch(connectionResult)
         {
            case SSL_OK:
               return CertificateStatus.TRUSTED;
            case SSL_NOT_AVAILABLE:
            case SSL_NO_CONNECTION:
            case SSL_HANDSHAKE_FAILED:
            case SSL_API_FAILURE:
            case SSL_CERT_API_ERROR:
               return CertificateStatus.INVALID;
            case SSL_CERT_EXPIRED:
               return CertificateStatus.EXPIRED;
            case SSL_CERT_NOT_YET_VALID:
               return CertificateStatus.NOT_YET_VALID;
            case SSL_CERT_PRINCIPAL_MISMATCH:
               return CertificateStatus.PRINCIPAL_MISMATCH;
            case SSL_CERT_UNTRUSTED_SIGNERS:
               return CertificateStatus.UNTRUSTED_SIGNERS;
            case SSL_CERT_REVOKED:
               return CertificateStatus.REVOKED;
            case SSL_CERT_INVALID:
               return CertificateStatus.INVALID;
            case SSL_CERT_INVALID_CHAIN:
               return CertificateStatus.INVALID_CHAIN;
            default:
               return CertificateStatus.INVALID;
         }
      }
   }
}

