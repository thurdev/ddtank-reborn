-- SQL_STORED_PROCEDURE dbo.Ddt_UpdateNickNameGames_Sto (modified 2012-04-21T07:53:25.247)









--Bill

CREATE       procedure [dbo].[Ddt_UpdateNickNameGames_Sto]
@isRightNow int,
@userName Nvarchar(50),
@oldNickName Nvarchar(50),
@newNickName Nvarchar(50),
@newTotal int,
@newWin int
as
declare @temp int,
@result int, --output --返回值  -1用户不存在 0 昵称已经存在 1 昵称战斗场次修改成功 2战斗场次修改成功
@newNickNameValue nvarchar(20)


select @temp=UserID from DB_Tank..sys_users_detail with(nolock) where UserName=@userName--检查当前用户是否有值

IF(@temp>0)
	BEGIN
		IF(@newNickName is NULL OR @newNickName='')--执行修改战斗场次
		BEGIN
				update DB_Tank..sys_users_detail set Total=@newTotal,win=@newWin where UserID=@temp 
				set @result=2
		END
	ELSE--执行昵称修改
		BEGIN
			set @newNickNameValue=(SELECT count(UserID) from DB_Tank..sys_users_detail where NickName=@newNickName) --检查新昵称是否可用
			
			IF(@newNickNameValue=0 AND @temp>0)--检查昵称是否可用
				BEGIN
					update DB_Tank..sys_users_detail set nickname=@newNickName,Total=@newTotal,win=@newWin 
					where UserID=@temp 
					set @result=1
					-----添加开始
					set xact_abort on
					begin tran
					INSERT INTO DB_Tank..Rename_Nick(UserId, UserName,NickName,[Date],IsExist,OldNickName) 
					VALUES(@temp, @userName, @newNickName , getdate(), 1,@oldNickName) 
					if @@error <> 0
						BEGIN
							rollback tran
						END
							commit tran
					set xact_abort OFF
					-----添加结束
					IF(@isRightNow=1)
						BEGIN
							EXEC Db_Tank.dbo.Sp_Renames_Batch--立即跟新
						END
					END
			ELSE
				 BEGIN
			 		set @result=0
				 END
						 

		END
	END
	
ELSE
	BEGIN
		set @result=-1
	END

--返回参数
RETURN @result















GO
