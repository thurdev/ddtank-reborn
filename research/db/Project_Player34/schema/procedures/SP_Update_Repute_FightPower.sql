-- SQL_STORED_PROCEDURE dbo.SP_Update_Repute_FightPower (modified 2021-06-04T05:18:35.873)

-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Update_Repute_FightPower]
AS

DECLARE @Repute int
declare @UserID int

DECLARE Employee_Cursor CURSOR FOR
SELECT UserID FROM Sys_Users_Detail WHERE FightPower > 0 ORDER by FightPower DESC;

OPEN Employee_Cursor;
FETCH NEXT FROM Employee_Cursor into @UserID;
set @Repute = 1;
WHILE @@FETCH_STATUS = 0
   BEGIN
		if (@Repute = 1)
		begin
			update Sys_Users_Detail SET Repute = @Repute WHERE UserID = @UserID
			--insert into Sys_User_Rank(UserID, RankID, UserRank, Validate, IsExit) VALUES (@UserID, 602, N'Poder de combate do Rei', 1, 'True')
		end
		else
		begin
			update Sys_Users_Detail SET Repute = @Repute WHERE UserID = @UserID
		end
		
		set @Repute = @Repute + 1
		FETCH NEXT FROM Employee_Cursor into @UserID;
   END;
CLOSE Employee_Cursor;
DEALLOCATE Employee_Cursor;

if(@@error <> 0)
begin
  return 1 ---Return false insert error
end





GO
