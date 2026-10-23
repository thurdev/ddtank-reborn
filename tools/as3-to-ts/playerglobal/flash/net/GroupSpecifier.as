package flash.net
{
   import flash.utils.*;
   
   [native(cls="GroupspecClass",instance="GroupspecObject",methods="auto")]
   [API("667")]
   public class GroupSpecifier
   {
      
      private var m_routing:String;
      
      private var m_multicast:String;
      
      private var m_objectReplication:String;
      
      private var m_posting:String;
      
      private var m_publishAuthHash:String;
      
      private var m_postingAuthHash:String;
      
      private var m_ipMulticastAddresses:String;
      
      private var m_bootstrapPeers:String;
      
      private var m_openServerChannel:String;
      
      private var m_disablePeerToPeer:String;
      
      private var m_tag:String;
      
      private var m_unique:String;
      
      private var m_publishAuth:String;
      
      private var m_postingAuth:String;
      
      private var m_ipMulticastMemberUpdates:String;
      
      private var m_minGroupspecVersion:int;
      
      public function GroupSpecifier(name:String)
      {
         super();
         if(Boolean(name))
         {
            this.m_tag = toOption(14,byteArrayToHex(stringToBytes(name)));
            this.m_unique = "";
            this.routingEnabled = false;
            this.multicastEnabled = false;
            this.objectReplicationEnabled = false;
            this.postingEnabled = false;
            this.setPublishPassword(null);
            this.setPostingPassword(null);
            this.clearIPMulticastAddresses();
            this.clearBootstrapPeers();
            this.serverChannelEnabled = false;
            this.peerToPeerDisabled = false;
            this.ipMulticastMemberUpdatesEnabled = false;
            if(this.swfVersion >= 18)
            {
               this.m_minGroupspecVersion = 2;
            }
            else
            {
               this.m_minGroupspecVersion = 1;
            }
            return;
         }
         throw new ArgumentError("Name can not be empty");
      }
      
      public static function encodePostingAuthorization(password:String) : String
      {
         return toOption(23,byteArrayToHex(stringToBytes(password)));
      }
      
      public static function encodePublishAuthorization(password:String) : String
      {
         return toOption(21,byteArrayToHex(stringToBytes(password)));
      }
      
      public static function encodeIPMulticastAddressSpec(address:String, port:* = null, source:String = null) : String
      {
         return encodeIPMulticastAddress(address,port,source);
      }
      
      public static function encodeBootstrapPeerIDSpec(peerID:String) : String
      {
         return toOption(11,peerID);
      }
      
      [API("684")]
      public static function get maxSupportedGroupspecVersion() : int
      {
         return 2;
      }
      
      private static function SaltedSHA256(salt:String, bytes:ByteArray) : String
      {
         var saltedBytes:ByteArray = null;
         var saltHex:String = null;
         if(Boolean(salt))
         {
            saltedBytes = stringToBytes(salt);
            saltHex = byteArrayToHex(saltedBytes);
            saltedBytes.writeBytes(bytes);
            saltedBytes.position = 0;
            return saltHex + GroupSpecifier.SHA256(saltedBytes);
         }
         return GroupSpecifier.SHA256(bytes);
      }
      
      private static function encodeIPMulticastAddress(address:String, port:*, source:String) : String
      {
         var val:String = null;
         var is6:Boolean = false;
         try
         {
            val = inet_ptohex6(address,port);
            is6 = true;
         }
         catch(e:Error)
         {
            val = inet_ptohex4(address,port);
         }
         if(Boolean(source))
         {
            val += (is6 ? inet_ptohex6(source,0) : inet_ptohex4(source,0)).substr(0,-4);
         }
         return toOption(10,val);
      }
      
      private static function hexByte(byte:uint) : String
      {
         var rv:String = null;
         if(byte > 255)
         {
            throw new RangeError();
         }
         rv = byte.toString(16);
         if(rv.length < 2)
         {
            rv = "0" + rv;
         }
         return rv;
      }
      
      private static function vlu(num:uint) : String
      {
         var tmp:uint = 0;
         var rv:String = "";
         do
         {
            tmp = uint(num & 0x7F);
            if(rv.length > 0)
            {
               tmp |= 128;
            }
            rv = hexByte(tmp) + rv;
            num >>= 7;
         }
         while(Boolean(num));
         return rv;
      }
      
      private static function toOption(optionID:uint, hexBytes:String) : String
      {
         var tmp:String = null;
         tmp = vlu(optionID) + hexBytes;
         return vlu(tmp.length / 2) + tmp;
      }
      
      private static function inet_ptohex4(address:String, port:* = null) : String
      {
         var pattern1:RegExp = null;
         var pattern2:RegExp = null;
         var match:Object = null;
         var pattern3:RegExp = null;
         var pattern4:RegExp = null;
         var matchNoPort:Object = null;
         var portInt:int = 0;
         if(null == port)
         {
            pattern1 = /\[(\d+)\.(\d+)\.(\d+)\.(\d+)\]:(\d+)/;
            pattern2 = /(\d+)\.(\d+)\.(\d+)\.(\d+):(\d+)/;
            match = pattern1.exec(address);
            if(!match)
            {
               match = pattern2.exec(address);
            }
            if(Boolean(match))
            {
               return hexByte(match[1]) + hexByte(match[2]) + hexByte(match[3]) + hexByte(match[4]) + hexByte(match[5] / 256) + hexByte(match[5] & 0xFF);
            }
            throw new ArgumentError("Invalid address");
         }
         pattern3 = /\[(\d+)\.(\d+)\.(\d+)\.(\d+)\]/;
         pattern4 = /(\d+)\.(\d+)\.(\d+)\.(\d+)/;
         portInt = int(port);
         matchNoPort = pattern3.exec(address);
         if(!matchNoPort)
         {
            matchNoPort = pattern4.exec(address);
         }
         if(Boolean(matchNoPort))
         {
            return hexByte(matchNoPort[1]) + hexByte(matchNoPort[2]) + hexByte(matchNoPort[3]) + hexByte(matchNoPort[4]) + hexByte(portInt / 256) + hexByte(portInt & 0xFF);
         }
         throw new ArgumentError("Invalid address");
      }
      
      private static function inet_ptohex6(address:String, port:* = null) : String
      {
         var i:int = 0;
         var v4match:Object = null;
         var portNum:int = 0;
         var len:int = 0;
         var p:String = null;
         var tmp:String = null;
         var hexComponent:int = 0;
         var pattern:RegExp = /(::)|([:\[\]])|(\d+\.\d+\.\d+\.\d+)|([0-9a-fA-F]+)/g;
         var v4pattern:RegExp = /(\d+)\.(\d+)\.(\d+)\.(\d+)/;
         var parts:Array = address.match(pattern);
         var front:String = "";
         var back:String = "";
         var parsePort:Boolean = false;
         var useBack:Boolean = false;
         var anyColons:Boolean = false;
         if(null == parts)
         {
            throw new ArgumentError();
         }
         for(i = 0; i < parts.length; i++)
         {
            p = parts[i];
            if("]" == p)
            {
               parsePort = true;
            }
            else if("::" == p)
            {
               if(useBack)
               {
                  throw new RangeError();
               }
               useBack = true;
               anyColons = true;
            }
            else if(":" == p)
            {
               anyColons = true;
            }
            else if("[" != p)
            {
               if(parsePort)
               {
                  if(Boolean(port))
                  {
                     throw new ArgumentError();
                  }
                  port = p;
               }
               else
               {
                  v4match = v4pattern.exec(p);
                  if(Boolean(v4match))
                  {
                     if(!anyColons || !useBack && front.length != 28)
                     {
                        throw new ArgumentError();
                     }
                     parsePort = true;
                     back = back + hexByte(v4match[1]) + hexByte(v4match[2]) + hexByte(v4match[3]) + hexByte(v4match[4]);
                  }
                  else
                  {
                     hexComponent = int(parseInt(p,16));
                     if(hexComponent > 65535)
                     {
                        throw new RangeError();
                     }
                     tmp = hexByte(hexComponent / 256) + hexByte(hexComponent & 0xFF);
                     if(useBack)
                     {
                        back += tmp;
                     }
                     else
                     {
                        front += tmp;
                     }
                  }
               }
            }
         }
         if(!anyColons)
         {
            throw new ArgumentError();
         }
         len = front.length + back.length;
         if(len > 32)
         {
            throw new RangeError();
         }
         while(len++ < 32)
         {
            front += "0";
         }
         if(null == port)
         {
            throw new ArgumentError();
         }
         portNum = int(port);
         if(portNum < 0 || portNum > 65535)
         {
            throw new RangeError();
         }
         back = back + hexByte(portNum / 256) + hexByte(portNum & 0xFF);
         return front + back;
      }
      
      private static function byteArrayToHex(bytes:ByteArray) : String
      {
         var i:int = 0;
         var rv:String = "";
         for(i = 0; i < bytes.length; i++)
         {
            rv += hexByte(bytes[i]);
         }
         return rv;
      }
      
      private static function stringToBytes(str:String) : ByteArray
      {
         var rv:ByteArray = new ByteArray();
         rv.writeUTFBytes(str);
         return rv;
      }
      
      private static function SHA256(arr:ByteArray) : String
      {
         return calcSHA256Digest(arr);
      }
      
      private static native function calcSHA256Digest(param1:ByteArray) : String;
      
      private static native function GetCryptoRandomString(param1:uint) : String;
      
      public function makeUnique() : void
      {
         this.m_unique = toOption(14,GetCryptoRandomString(32));
      }
      
      public function get routingEnabled() : Boolean
      {
         return this.m_routing != "";
      }
      
      public function set routingEnabled(enabled:Boolean) : void
      {
         if(enabled)
         {
            this.m_routing = "0100";
         }
         else
         {
            this.m_routing = "";
         }
      }
      
      public function get multicastEnabled() : Boolean
      {
         return this.m_multicast != "";
      }
      
      public function set multicastEnabled(enabled:Boolean) : void
      {
         if(enabled)
         {
            this.m_multicast = "0101";
         }
         else
         {
            this.m_multicast = "";
         }
      }
      
      public function get objectReplicationEnabled() : Boolean
      {
         return this.m_objectReplication != "";
      }
      
      public function set objectReplicationEnabled(enabled:Boolean) : void
      {
         if(enabled)
         {
            this.m_objectReplication = "0102";
         }
         else
         {
            this.m_objectReplication = "";
         }
      }
      
      public function get postingEnabled() : Boolean
      {
         return this.m_posting != "";
      }
      
      public function set postingEnabled(enabled:Boolean) : void
      {
         if(enabled)
         {
            this.m_posting = "0103";
         }
         else
         {
            this.m_posting = "";
         }
      }
      
      private function clearIPMulticastAddresses() : void
      {
         this.m_ipMulticastAddresses = "";
      }
      
      private function clearBootstrapPeers() : void
      {
         this.m_bootstrapPeers = "";
      }
      
      public function get peerToPeerDisabled() : Boolean
      {
         return this.m_disablePeerToPeer != "";
      }
      
      public function set peerToPeerDisabled(disable:Boolean) : void
      {
         if(disable)
         {
            this.m_disablePeerToPeer = "010d";
         }
         else
         {
            this.m_disablePeerToPeer = "";
         }
      }
      
      public function get ipMulticastMemberUpdatesEnabled() : Boolean
      {
         return this.m_ipMulticastMemberUpdates != "";
      }
      
      public function set ipMulticastMemberUpdatesEnabled(enabled:Boolean) : void
      {
         if(enabled)
         {
            this.m_ipMulticastMemberUpdates = "011b";
         }
         else
         {
            this.m_ipMulticastMemberUpdates = "";
         }
      }
      
      public function setPublishPassword(password:String = null, salt:String = null) : void
      {
         var tmp:ByteArray = null;
         if(Boolean(password))
         {
            tmp = stringToBytes(password);
            tmp.position = 0;
            this.m_publishAuth = toOption(21,byteArrayToHex(tmp));
            this.m_publishAuthHash = toOption(5,GroupSpecifier.SaltedSHA256(salt,tmp));
         }
         else
         {
            this.m_publishAuthHash = "";
            this.m_publishAuth = "";
         }
      }
      
      public function setPostingPassword(password:String = null, salt:String = null) : void
      {
         var tmp:ByteArray = null;
         if(Boolean(password))
         {
            tmp = stringToBytes(password);
            tmp.position = 0;
            this.m_postingAuth = toOption(23,byteArrayToHex(tmp));
            this.m_postingAuthHash = toOption(7,GroupSpecifier.SaltedSHA256(salt,tmp));
         }
         else
         {
            this.m_postingAuthHash = "";
            this.m_postingAuth = "";
         }
      }
      
      public function get serverChannelEnabled() : Boolean
      {
         return this.m_openServerChannel != "";
      }
      
      public function set serverChannelEnabled(enabled:Boolean) : void
      {
         if(enabled)
         {
            this.m_openServerChannel = "010c";
         }
         else
         {
            this.m_openServerChannel = "";
         }
      }
      
      public function addBootstrapPeer(peerID:String) : void
      {
         this.m_bootstrapPeers += toOption(11,peerID);
      }
      
      public function addIPMulticastAddress(address:String, port:* = null, source:String = null) : void
      {
         this.m_ipMulticastAddresses += encodeIPMulticastAddress(address,port,source);
      }
      
      public function toString() : String
      {
         return this.groupspecWithAuthorizations();
      }
      
      public function groupspecWithoutAuthorizations() : String
      {
         var versionString:String = "";
         var minVersion:int = this.minGroupspecVersion;
         if(minVersion > 1)
         {
            versionString = toOption(127,vlu(minVersion));
         }
         return "G:" + versionString + this.m_routing + this.m_multicast + this.m_objectReplication + this.m_posting + this.m_publishAuthHash + this.m_postingAuthHash + this.m_openServerChannel + this.m_disablePeerToPeer + this.m_tag + this.m_unique + this.m_ipMulticastMemberUpdates + "00" + this.groupspecExtras();
      }
      
      private function groupspecExtras() : String
      {
         return this.m_ipMulticastAddresses + this.m_bootstrapPeers;
      }
      
      public function groupspecWithAuthorizations() : String
      {
         return this.groupspecWithoutAuthorizations() + this.authorizations();
      }
      
      public function authorizations() : String
      {
         return this.m_publishAuth + this.m_postingAuth;
      }
      
      [API("684")]
      public function get minGroupspecVersion() : int
      {
         return this.m_minGroupspecVersion;
      }
      
      [API("684")]
      public function set minGroupspecVersion(version:int) : void
      {
         this.m_minGroupspecVersion = Math.max(version,1);
      }
      
      private native function get swfVersion() : int;
   }
}

