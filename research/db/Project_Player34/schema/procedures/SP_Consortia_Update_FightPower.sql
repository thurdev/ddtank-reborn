-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Update_FightPower (modified 2021-06-04T05:18:35)


-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：插入用户buff(防踢、双倍经验、双倍功勋)信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Consortia_Update_FightPower]
as

DECLARE @FightPower int
declare @ConsortiaID int

DECLARE Employee_Cursor CURSOR FOR
SELECT ConsortiaID FROM Consortia WHERE Count > 1;

OPEN Employee_Cursor;
FETCH NEXT FROM Employee_Cursor into @ConsortiaID;
WHILE @@FETCH_STATUS = 0
   BEGIN
		select @FightPower=SUM(FightPower) from Sys_Users_Detail WHERE ConsortiaID = @ConsortiaID
		IF @FightPower is NOT NULL
		BEGIN
			update Consortia SET FightPower = @FightPower WHERE ConsortiaID = @ConsortiaID
		END
		FETCH NEXT FROM Employee_Cursor into @ConsortiaID;
   END;
CLOSE Employee_Cursor;
DEALLOCATE Employee_Cursor;

select TOP 50 * from Consortia order by FightPower DESC




GO
