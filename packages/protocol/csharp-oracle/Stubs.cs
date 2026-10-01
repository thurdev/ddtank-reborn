// Minimal stand-ins for third-party libs referenced by the original sources (logging / protobuf only;
// none of them influence bytes on the wire).
using System;
using System.IO;

namespace log4net
{
    public interface ILog
    {
        bool IsErrorEnabled { get; }
        bool IsInfoEnabled { get; }
        bool IsDebugEnabled { get; }
        void Error(object msg);
        void Error(object msg, Exception e);
        void ErrorFormat(string f, params object[] a);
        void Warn(object msg);
        void WarnFormat(string f, params object[] a);
        void Info(object msg);
        void InfoFormat(string f, params object[] a);
        void Debug(object msg);
    }

    internal sealed class NullLog : ILog
    {
        public bool IsErrorEnabled => false;
        public bool IsInfoEnabled => false;
        public bool IsDebugEnabled => false;
        public void Error(object msg) { }
        public void Error(object msg, Exception e) { Console.Error.WriteLine("[log4net] " + msg + " " + e); }
        public void ErrorFormat(string f, params object[] a) { }
        public void Warn(object msg) { }
        public void WarnFormat(string f, params object[] a) { }
        public void Info(object msg) { }
        public void InfoFormat(string f, params object[] a) { }
        public void Debug(object msg) { }
    }

    public static class LogManager
    {
        public static ILog GetLogger(Type t) => new NullLog();
    }
}

namespace ProtoBuf
{
    public static class Serializer
    {
        public static T Deserialize<T>(Stream s) => throw new NotSupportedException();
        public static void Serialize<T>(Stream s, T v) => throw new NotSupportedException();
    }
}
