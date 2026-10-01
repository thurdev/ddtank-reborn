-- SQL_STORED_PROCEDURE dbo.SP_Fight_Record_Add (modified 2021-06-04T01:29:17.977)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<变装战斗:完成一场变装战斗记录操作>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Fight_Record_Add]
 @PlayBegin datetime, 
 @PlayEnd datetime, 
 @ChangeTeam int, 
 @TeamA nvarchar(200),
 @TeamB nvarchar(200),
 @MapID int, 
 @RoomType int, 
 @FightName nvarchar(50),
 @WinTeam int
AS  

     INSERT INTO Fight_Record( PlayBegin, PlayEnd,ChangeTeam, TeamA, TeamB, MapID, RoomType, FightName,WinTeam) 
     VALUES( @PlayBegin, @PlayEnd,@ChangeTeam, @TeamA, @TeamB, @MapID, @RoomType, @FightName,@WinTeam)








GO
