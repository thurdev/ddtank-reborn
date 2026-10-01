-- SQL_STORED_PROCEDURE dbo.SP_Active_ChickCode (modified 2022-01-26T04:31:15.740)


-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<读取一条活动记录>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Active_ChickCode]
	 @UserID int
	,@ActiveCode nvarchar(100)
AS
	DECLARE @count int
	select @count = COUNT(ActiveCode) from ChickActive_Number WHERE ActiveCode = @ActiveCode AND UserID = 0
	if (@count <> 0)
	begin
		-- kiem tra xem nhan chua
		DECLARE @count2 int
		select @count = COUNT(ActiveCode) from ChickActive_Number WHERE UserID = @UserID
		if(@count2 <> 0) 
		begin
			-- nhan roi
			return 2
		end
		else
		begin
			update ChickActive_Number set UserID = @UserID, GetDate = GetDate() WHERE ActiveCode = @ActiveCode
			return 0
		end
	end
	else
	begin
		return 1
	end
	


GO
