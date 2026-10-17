-- SQL_STORED_PROCEDURE dbo.Sp_LogServer (modified 2015-01-25T14:04:48.580)
CREATE PROCEDURE [dbo].[Sp_LogServer]
@EnterTime DateTime,
@Online int,
@Reg int
AS

if Not Exists(Select EnterTime From Db_Count.dbo.Log_Server where EnterTime=@EnterTime)
   Insert Into Db_Count.dbo.Log_Server(ApplicationId,SubId,EnterTime,OnLine,Reg)
          Select 1,1,@EnterTime,@Online,@Reg

GO
